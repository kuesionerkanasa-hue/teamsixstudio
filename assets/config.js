// Konfigurasi PUBLIK. Aman ada di browser: hanya berisi URL project dan publishable (anon) key.
// JANGAN PERNAH menaruh service_role / secret key / password admin di file ini.
window.EFS_CONFIG = {
  SUPABASE_URL: "https://dxhuyvvvblcivsmaldcu.supabase.co",
  SUPABASE_KEY: "sb_publishable_VJiuwfTAJ42l0BnVOIoLcw_AzszYTjY",

  // Opsional. Jika diisi, modal Admin hanya meminta password (email ini publik, bukan rahasia,
  // dan TIDAK memberi akses apa pun tanpa password + baris di tabel ef_admins).
  // Jika kosong, modal meminta email + password.
  ADMIN_EMAIL: "",

  // Alamat situs yang dipakai di QR code & tombol Share. Isi dengan alamat GitHub Pages kamu
  // (mis. "https://kuesionerkanasa-hue.github.io/teamsixstudio/"). Jika kosong, memakai alamat halaman saat ini.
  SITE_URL: "https://kuesionerkanasa-hue.github.io/teamsixstudio/",

  // Sesi admin otomatis keluar setelah sekian menit tanpa aktivitas di panel.
  // Opsional — tampil di bagian About jika diisi (kosong = tidak ditampilkan).
  LECTURER: "",        // mis. "Dosen pengampu: Nama Dosen, M.A.P."
  CONTACT: "",         // mis. "Hubungi admin: email@contoh.com"

  ADMIN_IDLE_MINUTES: 30
};
