﻿#region license
// Copyright 2024 Utah Departement of Transportation
// for Data - Utah.Udot.Atspm.Data/LegacyEventLogContext.cs
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
#endregion

// <auto-generated> This file has been auto generated by EF Core Power Tools. </auto-generated>
#nullable disable
using Microsoft.EntityFrameworkCore;

namespace Utah.Udot.Atspm.Data
{
    public partial class LegacyEventLogContext : DbContext
    {
        public LegacyEventLogContext()
        {
        }

        public LegacyEventLogContext(DbContextOptions<LegacyEventLogContext> options) : base(options)
        {
        }

        public virtual DbSet<ControllerEventLog> ControllerEventLogs { get; set; }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<string>().AreUnicode(false);
            //configurationBuilder.Properties<DateTime>().HaveColumnType("datetime");
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            modelBuilder.Entity<ControllerEventLog>(builder =>
            {
                builder.ToTable("Controller_Event_Log");

                builder.ToTable(t => t.HasComment("Old Log Data Table"));

                builder.HasKey(e => new { e.SignalIdentifier, e.Timestamp, e.EventCode, e.EventParam });

                //builder.Property(e => e.ArchiveDate).Metadata.AddAnnotation("KeyNameFormat", "dd-MM-yyyy");

                builder.Property(e => e.SignalIdentifier)
                        .IsRequired()
                        .HasMaxLength(10)
                        .HasColumnName("locationId");
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}