﻿#region license
// Copyright 2024 Utah Departement of Transportation
// for ConfigApi - ATSPM.ConfigApi.Configuration/ApproachOdataConfiguration.cs
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

using Asp.Versioning;
using Asp.Versioning.OData;
using Microsoft.OData.ModelBuilder;
using Utah.Udot.Atspm.Data.Models;

namespace Utah.Udot.Atspm.ConfigApi.Configuration
{
    /// <summary>
    /// Approach oData configuration
    /// </summary>
    public class ApproachOdataConfiguration : IModelConfiguration
    {
        ///<inheritdoc/>
        public void Apply(ODataModelBuilder builder, ApiVersion apiVersion, string? routePrefix)
        {
            var model = builder.EntitySet<Approach>("Approach")
                .EntityType
                .Page(default, default)
                .Expand(1, SelectExpandType.Automatic, new string[] { "directionType", "Location" });

            switch (apiVersion.MajorVersion)
            {
                case 1:
                    {
                        break;
                    }
            }
        }
    }
}