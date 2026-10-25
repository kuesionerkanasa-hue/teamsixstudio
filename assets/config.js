// Konfigurasi PUBLIK. Aman ada di browser: hanya berisi URL project dan publishable (anon) key.
// JANGAN PERNAH menaruh service_role / secret key / password admin di file ini.
window.EFS_CONFIG = {
  SUPABASE_URL: "https://dxhuyvvvblcivsmaldcu.supabase.co",
  SUPABASE_KEY: "sb_publishable_VJiuwfTAJ42l0BnVOIoLcw_AzszYTjY",

  // Opsional. Jika diisi, modal Admin hanya meminta password (email ini publik, bukan rahasia,
  // dan TIDAK memberi akses apa pun tanpa password + baris di tabel ef_admins).
  // Jika kosong, modal meminta email + password.
  ADMIN_EMAIL: "",

  // Sesi admin otomatis keluar setelah sekian menit tanpa aktivitas di panel.
  ADMIN_IDLE_MINUTES: 30
};
