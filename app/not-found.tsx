export default function NotFound() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">Halaman Tidak Ditemukan</h2>
      <p className="text-muted-foreground mb-4">
        Maaf, halaman yang Anda cari tidak dapat ditemukan.
      </p>
      <a href="/" className="text-primary hover:underline">
        Kembali ke Beranda
      </a>
    </div>
  )
}