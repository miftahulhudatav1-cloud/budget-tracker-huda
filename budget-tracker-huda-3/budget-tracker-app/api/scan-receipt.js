import Anthropic from '@anthropic-ai/sdk';

// Pilihan ini harus persis sama dengan <select> di index.html. Kalau salah satu
// daftar diubah, ubah juga yang di sana — nilai di luar daftar tidak akan cocok
// dengan dropdown dan field-nya akan tampak kosong.
const KATEGORI = ['Tempat Tinggal','Makanan','Transportasi','Kuliah','Komunikasi','Kesehatan','Hiburan','Tabungan','Lainnya'];
const JENIS    = ['Pengeluaran Tetap','Pengeluaran Tidak Tetap','Kebutuhan Pokok','Kebutuhan Sekunder','Keinginan','Tagihan','Pendidikan','Darurat'];
const METODE   = ['Tunai','Transfer','Dompet Digital','Kartu Debit','Kartu Kredit','Lainnya'];

const MIME_DIIZINKAN = ['image/jpeg','image/png','image/webp'];

// Batas body Vercel 4,5 MB. Klien sudah mengompres ke ratusan KB, jadi batas ini
// hanya jaring pengaman terhadap kiriman yang tidak wajar.
const MAKS_BASE64 = 3_500_000;

// Schema ditulis manual, bukan lewat zodOutputFormat: dengan zod 4 helper itu
// menurunkan enum menjadi teks description sehingga tidak lagi dipaksakan API.
const SCHEMA = {
  type: 'object',
  properties: {
    amount: { type: 'number', description: 'Total akhir yang benar-benar dibayar, dalam Rupiah. Bilangan bulat tanpa pemisah ribuan. Ambil GRAND TOTAL setelah diskon dan pajak — bukan subtotal, bukan jumlah uang tunai yang diserahkan, bukan kembalian.' },
    date:   { type: ['string','null'], description: 'Tanggal transaksi pada struk, format YYYY-MM-DD. null bila tidak tercetak di struk.' },
    desc:   { type: 'string', description: 'Nama toko atau merchant. Bila tidak ada, ringkasan singkat isi belanjaan. Maksimal 60 karakter.' },
    cat:    { type: 'string', enum: KATEGORI, description: 'Kategori pengeluaran yang paling sesuai.' },
    type:   { type: 'string', enum: JENIS,    description: 'Jenis pengeluaran yang paling sesuai.' },
    method: { type: 'string', enum: METODE,   description: 'Metode pembayaran bila tertulis di struk. Bila tidak tertulis, gunakan "Tunai" jika ada baris tunai/kembalian, selain itu "Lainnya".' },
    note:   { type: 'string', description: 'Ringkasan barang utama yang dibeli, dipisah koma. Kosongkan bila tidak jelas. Maksimal 120 karakter.' },
    confidence: { type: 'string', enum: ['tinggi','sedang','rendah'], description: 'Seberapa yakin pembacaan ini. Gunakan "rendah" bila gambar buram, terpotong, atau totalnya ambigu.' }
  },
  required: ['amount','date','desc','cat','type','method','note','confidence'],
  additionalProperties: false
};

const SYSTEM = `Kamu membaca foto struk belanja Indonesia dan mengubahnya menjadi satu entri pengeluaran.

Aturan:
- Nominal Rupiah memakai titik sebagai pemisah ribuan (15.000 berarti lima belas ribu, bukan lima belas). Angka di belakang koma adalah desimal dan hampir selalu 00.
- Ambil GRAND TOTAL / TOTAL BAYAR setelah diskon dan pajak. Jangan ambil subtotal, jangan ambil nominal "TUNAI"/"CASH" yang diserahkan pembeli, jangan ambil "KEMBALI"/"KEMBALIAN".
- Bila struk memuat beberapa transaksi, ambil yang totalnya paling akhir.
- Jangan mengarang. Bila sebuah nilai tidak terbaca, pilih opsi paling netral yang tersedia dan turunkan confidence.
- Bila gambar sama sekali bukan struk belanja, set amount 0 dan confidence "rendah".`;

function kirim(res, status, payload) {
  res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return kirim(res, 405, { ok: false, error: 'Gunakan metode POST.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Konfigurasi server yang belum lengkap — bukan kesalahan pengguna.
    console.error('ANTHROPIC_API_KEY belum diset di Environment Variables.');
    return kirim(res, 500, { ok: false, error: 'Fitur scan struk belum dikonfigurasi di server.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body) return kirim(res, 400, { ok: false, error: 'Body permintaan tidak valid.' });

  const { image, mediaType } = body;
  if (typeof image !== 'string' || !image) {
    return kirim(res, 400, { ok: false, error: 'Gambar tidak ditemukan dalam permintaan.' });
  }
  if (!MIME_DIIZINKAN.includes(mediaType)) {
    return kirim(res, 400, { ok: false, error: 'Format gambar harus JPEG, PNG, atau WebP.' });
  }
  if (image.length > MAKS_BASE64) {
    return kirim(res, 413, { ok: false, error: 'Ukuran gambar terlalu besar.' });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,          // ruang untuk adaptive thinking + JSON yang kecil
      system: SYSTEM,
      output_config: {
        effort: 'medium',        // naikkan ke 'high' bila struk sulit sering salah baca
        format: { type: 'json_schema', schema: SCHEMA }
      },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'Baca struk ini dan keluarkan satu entri pengeluaran.' }
        ]
      }]
    });

    if (response.stop_reason === 'refusal') {
      return kirim(res, 422, { ok: false, error: 'Gambar ini tidak bisa diproses. Coba foto struk yang lain.' });
    }

    const data = response.parsed_output;
    if (!data) {
      return kirim(res, 502, { ok: false, error: 'Struk tidak terbaca. Coba foto ulang dengan cahaya lebih terang.' });
    }

    return kirim(res, 200, {
      ok: true,
      data,
      usage: {
        input_tokens: response.usage?.input_tokens ?? null,
        output_tokens: response.usage?.output_tokens ?? null
      }
    });

  } catch (err) {
    // Rantai dari yang paling spesifik ke paling umum. Pesan internal tidak
    // pernah diteruskan ke klien agar detail kunci/akun tidak bocor.
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('API key ditolak:', err.message);
      return kirim(res, 500, { ok: false, error: 'Kredensial server ditolak. Periksa ANTHROPIC_API_KEY.' });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return kirim(res, 429, { ok: false, error: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.' });
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error('Permintaan ditolak API:', err.message);
      return kirim(res, 400, { ok: false, error: 'Gambar ditolak. Coba foto ulang dengan format JPEG.' });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return kirim(res, 504, { ok: false, error: 'Gagal menghubungi layanan. Periksa koneksi lalu coba lagi.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Error API ${err.status}:`, err.message);
      return kirim(res, 502, { ok: false, error: 'Layanan pembaca struk sedang bermasalah.' });
    }
    console.error('Error tak terduga:', err);
    return kirim(res, 500, { ok: false, error: 'Terjadi kesalahan tak terduga.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
