using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Utah.Udot.ATSPM.PostgreSQLDatabaseProvider.Migrations.EventLog
{
    /// <inheritdoc />
    public partial class V5_ModifyKeyForCompressedEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CompressedEvents",
                table: "CompressedEvents");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CompressedEventsWithType",
                table: "CompressedEvents",
                columns: new[] { "LocationIdentifier", "DeviceId", "DataType", "Start", "End" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CompressedEvents",
                table: "CompressedEvents");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CompressedEventsWithType",
                table: "CompressedEvents",
                columns: new[] { "LocationIdentifier", "DeviceId", "Start", "End" });
        }
    }
}
