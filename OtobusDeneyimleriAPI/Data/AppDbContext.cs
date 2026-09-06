using Microsoft.EntityFrameworkCore;
using OtobusDeneyimleriAPI.Models;

namespace OtobusDeneyimleriAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Company> Companies { get; set; }
        public DbSet<BusRoute> Routes { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<User> Users { get; set; } // İŞTE EKSİK OLAN SATIR BU!

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Company>().HasData(
                new Company { Id = 1, Name = "Kamil Koç", Slug = "kamil-koc" },
                new Company { Id = 2, Name = "Pamukkale Turizm", Slug = "pamukkale-turizm" },
                new Company { Id = 3, Name = "Metro Turizm", Slug = "metro-turizm" },
                new Company { Id = 4, Name = "Ali Osman Ulusoy", Slug = "ali-osman-ulusoy" },
                new Company { Id = 5, Name = "Varan Turizm", Slug = "varan-turizm" },
                new Company { Id = 6, Name = "Nilüfer Turizm", Slug = "nilufer-turizm" },
                new Company { Id = 7, Name = "Efe Tur", Slug = "efe-tur" },
                new Company { Id = 8, Name = "Isparta Petrol", Slug = "isparta-petrol" }
            );

            modelBuilder.Entity<BusRoute>().HasData(
                new BusRoute { Id = 1, Slug = "istanbul-ankara" },
                new BusRoute { Id = 2, Slug = "izmir-bursa" },
                new BusRoute { Id = 3, Slug = "ankara-antalya" },
                new BusRoute { Id = 4, Slug = "bursa-adana" },
                new BusRoute { Id = 5, Slug = "istanbul-izmir" },
                new BusRoute { Id = 6, Slug = "ankara-trabzon" },
                new BusRoute { Id = 7, Slug = "antalya-mugla" }
            );
        }
    }
}