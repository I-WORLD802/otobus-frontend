using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OtobusDeneyimleriAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminReply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminReply",
                table: "Reviews",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminReply",
                table: "Reviews");
        }
    }
}
