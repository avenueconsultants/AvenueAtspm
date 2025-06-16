using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Utah.Udot.ATSPM.PostgreSQLDatabaseProvider.Migrations.Config
{
    /// <inheritdoc />
    public partial class V5_MapLayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MapLayer",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", unicode: false, nullable: true),
                    ServiceType = table.Column<string>(type: "text", unicode: false, nullable: true),
                    ShowByDefault = table.Column<bool>(type: "boolean", nullable: false),
                    MapLayerUrl = table.Column<string>(type: "text", unicode: false, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "timestamp", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", unicode: false, nullable: true),
                    UpdatedOn = table.Column<DateTime>(type: "timestamp", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", unicode: false, nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "timestamp", nullable: true),
                    DeletedBy = table.Column<string>(type: "text", unicode: false, nullable: true),
                    RefreshIntervalSeconds = table.Column<int>(type: "integer", nullable: true),
                    Created = table.Column<DateTime>(type: "timestamp", nullable: true),
                    Modified = table.Column<DateTime>(type: "timestamp", nullable: true),
                    ModifiedBy = table.Column<string>(type: "text", unicode: false, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MapLayer", x => x.Id);
                },
                comment: "Map Layer");

            migrationBuilder.CreateIndex(
                name: "IX_MapLayer_Name",
                table: "MapLayer",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MapLayer");

            migrationBuilder.DeleteData(
                table: "MeasureOptions",
                keyColumn: "Id",
                keyValue: 120);

            migrationBuilder.DeleteData(
                table: "MeasureType",
                keyColumn: "Id",
                keyValue: 38);

        }
    }
}
