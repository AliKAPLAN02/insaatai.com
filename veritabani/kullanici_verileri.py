
-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS kullanicilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- PostgreSQL’de SERIAL olacak
    ad VARCHAR(100) NOT NULL,
    soyad VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    sifre_hash TEXT NOT NULL,
    telefon VARCHAR(20),
    kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    abonelik_turu VARCHAR(50), -- Basic, Pro, Team
    odeme_durumu VARCHAR(20) DEFAULT 'beklemede' -- beklemede, aktif, iptal
);

-- Ödemeler tablosu
CREATE TABLE IF NOT EXISTS odemeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER NOT NULL,
    tutar DECIMAL(10,2) NOT NULL,
    para_birimi VARCHAR(10) DEFAULT 'TRY',
    odeme_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    odeme_yontemi VARCHAR(50), -- kredi_karti, havale, stripe, paypal vb.
    durum VARCHAR(20) DEFAULT 'basarili', -- basarili, beklemede, iptal
    FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
);

-- Giriş kayıtları tablosu (Opsiyonel)
CREATE TABLE IF NOT EXISTS giris_loglari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER NOT NULL,
    giris_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_adresi VARCHAR(45),
    FOREIGN KEY (kullanici_id) REFERENCES kullanicilar(id)
);

