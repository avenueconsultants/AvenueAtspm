﻿#region license
// Copyright 2024 Utah Departement of Transportation
// for Data - Utah.Udot.Atspm.Data.Models/Device.cs
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
using Utah.Udot.Atspm.Data.Enums;
using Utah.Udot.Atspm.Data.Relationships;

namespace Utah.Udot.Atspm.Data.Models
{
    /// <summary>
    /// Device that can be assigned to <see cref="Location"/>
    /// </summary>
    public partial class Device : AtspmConfigModelBase<int>, IRelatedLocation, IRelatedDeviceConfiguration
    {
        /// <summary>
        /// Enable Location to be logged
        /// </summary>
        public bool LoggingEnabled { get; set; }

        /// <summary>
        /// Ipaddress of Location
        /// </summary>
        public string Ipaddress { get; set; }

        /// <summary>
        /// Device status
        /// </summary>
        public DeviceStatus DeviceStatus { get; set; }

        /// <summary>
        /// Device type
        /// </summary>
        public DeviceTypes DeviceType { get; set; }

        /// <summary>
        /// Device notes
        /// </summary>
        public string Notes { get; set; }

        #region IRelatedLocation

        /// <inheritdoc/>
        public int LocationId { get; set; }

        /// <inheritdoc/>
        public virtual Location Location { get; set; }

        #endregion

        #region IRelatedDeviceConfiguration

        /// <inheritdoc/>
        public int? DeviceConfigurationId { get; set; }

        /// <inheritdoc/>
        public virtual DeviceConfiguration DeviceConfiguration { get; set; }

        #endregion

        /// <inheritdoc/>
        public override string ToString() => $"{Id} - {Ipaddress} - {Location?.LocationIdentifier} - {DeviceType} - {DeviceStatus} --- {DeviceConfiguration}";
    }
}