using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace OtobusDeneyimleriAPI.Migrations
{
    /// <inheritdoc />
    public partial class OtomatikVerilerEklendi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Name", "Slug" },
                values: new object[] { "Metro Turizm", "metro-turizm" });

            migrationBuilder.InsertData(
                table: "Companies",
                columns: new[] { "Id", "Name", "Slug" },
                values: new object[,]
                {
                    { 4, "Ali Osman Ulusoy", "ali-osman-ulusoy" },
                    { 5, "Varan Turizm", "varan-turizm" },
                    { 6, "Nilüfer Turizm", "nilufer-turizm" },
                    { 7, "Efe Tur", "efe-tur" },
                    { 8, "Isparta Petrol", "isparta-petrol" }
                });

            migrationBuilder.UpdateData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DestinationId", "OriginId", "Slug" },
                values: new object[] { 0, 0, "istanbul-ankara" });

            migrationBuilder.UpdateData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DestinationId", "OriginId", "Slug" },
                values: new object[] { 0, 0, "izmir-bursa" });

            migrationBuilder.InsertData(
                table: "Routes",
                columns: new[] { "Id", "DestinationId", "OriginId", "Slug" },
                values: new object[,]
                {
                    { 3, 0, 0, "ankara-antalya" },
                    { 4, 0, 0, "bursa-adana" },
                    { 5, 0, 0, "istanbul-izmir" },
                    { 6, 0, 0, "ankara-trabzon" },
                    { 7, 0, 0, "antalya-mugla" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.UpdateData(
                table: "Companies",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Name", "Slug" },
                values: new object[] { "Ali Osman Ulusoy", "ali-osman-ulusoy" });

            migrationBuilder.UpdateData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DestinationId", "OriginId", "Slug" },
                values: new object[] { 1, 16, "bursa-adana" });

            migrationBuilder.UpdateData(
                table: "Routes",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DestinationId", "OriginId", "Slug" },
                values: new object[] { 6, 34, "istanbul-ankara" });
        }
    }
}
