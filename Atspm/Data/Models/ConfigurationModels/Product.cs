﻿#region license
// Copyright 2024 Utah Departement of Transportation
// for Data - Utah.Udot.Atspm.Data.Models/Product.cs
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
using Utah.Udot.Atspm.Data.Models;

namespace Utah.Udot.Atspm.Data.Models
{
    /// <summary>
    /// Products
    /// </summary>
    public partial class Product : AtspmConfigModelBase<int>
    {
        /// <summary>
        /// Manufacturer
        /// </summary>
        public string Manufacturer { get; set; }

        /// <summary>
        /// Model
        /// </summary>
        public string Model { get; set; }

        /// <summary>
        /// Product web page
        /// </summary>
        public string WebPage { get; set; }

        /// <summary>
        /// Configuration notes
        /// </summary>
        public string Notes { get; set; }

        /// <inheritdoc/>
        public override string ToString() => $"{Id} - {Manufacturer} - {Model}";
    }
}