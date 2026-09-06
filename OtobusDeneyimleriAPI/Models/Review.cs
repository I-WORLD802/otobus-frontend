namespace OtobusDeneyimleriAPI.Models
{
    public class Review
    {
        public int Id { get; set; }
        
        public int CompanyId { get; set; }
        public int RouteId { get; set; }
        
        public string UserName { get; set; } = "Anonim";
        public string TravelDate { get; set; } = string.Empty;
        
        // --- DEĞİŞTİRİLEN VE EKLENEN KISIM BAŞLANGICI ---
        public double OverallRating { get; set; } // Ana puan, sistemi bozmamak için zorunlu (double) kaldı.
        public double? Cleanliness { get; set; }  // Temizlik (boş bırakılabilir oldu)
        public double? Comfort { get; set; }      // Konfor (boş bırakılabilir oldu)
        public double? Punctuality { get; set; }  // Dakiklik (boş bırakılabilir oldu)
        public double? Staff { get; set; }        // Personel (boş bırakılabilir oldu)
        public double? Catering { get; set; }     // YENİ EKLENDİ: İkram (boş bırakılabilir)
        // --- DEĞİŞTİRİLEN VE EKLENEN KISIM BİTİŞİ ---
        
        // Yorum metni
        public string Text { get; set; } = string.Empty;

        // Admin Yanıtı (Boş geçilebilir)
        public string? AdminReply { get; set; }
        
        public Company? Company { get; set; }
        public BusRoute? Route { get; set; }
    }
}