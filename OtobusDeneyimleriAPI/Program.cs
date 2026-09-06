using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting; // YENİ EKLENDİ
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtobusDeneyimleriAPI.Data;
using System.Text;
using System.Threading.RateLimiting; // YENİ EKLENDİ

var builder = WebApplication.CreateBuilder(args);

// CORS İznini Tanımla (Frontend'in API'ye erişebilmesi için)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=otobus.db"));

// --- YENİ EKLENEN JWT AYARLARI ---
var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!))
        };
    });

// --- YENİ EKLENEN: SPAM KORUMASI (Rate Limiting) ---
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("ReviewLimit", opt =>
    {
        opt.PermitLimit = 3; 
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        opt.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests; 
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// CORS Kuralını Aktif Et
app.UseCors("AllowAll");

// --- SPAM KORUMASI DEVREYE ALINDI ---
app.UseRateLimiter(); // Kimlik doğrulamadan hemen önce çalışmalı

// --- KİMLİK DOĞRULAMA AKTİF EDİLDİ (Sıralama kritik) ---
app.UseAuthentication(); 
app.UseAuthorization();

app.MapControllers();

app.Run();