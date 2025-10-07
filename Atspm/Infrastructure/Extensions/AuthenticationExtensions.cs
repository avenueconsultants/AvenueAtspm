#region license
// Copyright 2025 Utah Departement of Transportation
// for Infrastructure - Utah.Udot.Atspm.Infrastructure.Extensions/AuthenticationExtensions.cs
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

using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace Utah.Udot.Atspm.Infrastructure.Extensions
{
    /// <summary>
    /// Helper extensions for <see cref="Microsoft.Extensions.Hosting"/> using <see cref="Microsoft.AspNetCore.Authentication"/> 
    /// </summary>
    public static class AuthenticationExtensions
    {
        /// <summary>
        /// Adds Atspm identity services if <see cref="Host"/> is not in <see cref="Environments.Development"/>
        /// </summary>
        /// <param name="services"></param>
        /// <param name="host"></param>
        /// <returns></returns>
        public static IServiceCollection AddAtspmIdentity(this IServiceCollection services, HostBuilderContext host)
        {
            //if (!host.HostingEnvironment.IsDevelopment())
            //{
            services.AddAtspmAuthentication(host);
            services.AddAtspmAuthorization();
            //}

            return services;
        }

        /// <summary>
        /// Add atspm authentication
        /// </summary>
        /// <param name="services"></param>
        /// <param name="host"></param>
        /// <returns></returns>
        public static IServiceCollection AddAtspmAuthentication(this IServiceCollection services, HostBuilderContext host)
        {
            services.Configure<CookiePolicyOptions>(options =>
            {
                options.MinimumSameSitePolicy = SameSiteMode.None;
                options.Secure = CookieSecurePolicy.Always;
            });

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = host.Configuration["Jwt:Issuer"],
                    ValidAudience = host.Configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(host.Configuration["Jwt:Key"]))
                };
            });

            var oidc = host.Configuration.GetSection("Oidc");
            if (oidc.Exists() && !string.IsNullOrEmpty(oidc["Authority"]) &&
                !string.IsNullOrEmpty(oidc["ClientId"]) &&
                !string.IsNullOrEmpty(oidc["ClientSecret"]) &&
                !string.IsNullOrEmpty(oidc["CallbackPath"]))
            {
                services.AddAuthentication()
            .AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, options =>
            {
                options.Authority = oidc["Authority"];
                options.ClientId = oidc["ClientId"];
                options.ClientSecret = oidc["ClientSecret"];
                options.ResponseType = OpenIdConnectResponseType.IdToken;
                options.SaveTokens = true;
                options.Scope.Clear();
                options.Scope.Add("openid");
                options.Scope.Add("email");
                options.Scope.Add("profile");
                options.Scope.Add("app:Atspm");

                options.CallbackPath = oidc["CallbackPath"];

                options.GetClaimsFromUserInfoEndpoint = true;
                options.UseTokenLifetime = true;
                options.SkipUnrecognizedRequests = true;

                options.Events = new OpenIdConnectEvents
                {
                    OnRedirectToIdentityProvider = context =>
                    {
                        var b = new UriBuilder(context.ProtocolMessage.RedirectUri);
                        b.Scheme = "https";
                        b.Port = -1;
                        context.ProtocolMessage.RedirectUri = b.ToString();

                        Console.WriteLine($"callback: {b.ToString()}");

                        return Task.CompletedTask;
                    },
                    //OnTokenResponseReceived = context =>
                    //{
                    //    var identity = context.Principal.Claims;
                    //    return Task.CompletedTask;
                    //},
                    //OnUserInformationReceived = context =>
                    //{
                    //    var identity = context.Principal.Claims;
                    //    return Task.CompletedTask;
                    //},
                    //OnAuthorizationCodeReceived = context =>
                    //{
                    //    var identity = context.Principal.Claims;
                    //    return Task.CompletedTask;
                    //},
                    //OnTokenValidated = context =>
                    //{
                    //    var identity = context.Principal.Claims;
                    //    return Task.CompletedTask;
                    //},
                };
            });
            }

            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme);

            return services;
        }

        private static AuthorizationPolicyBuilder RequireRoleOrAdmin(
           this AuthorizationPolicyBuilder builder, string role)
        { 
           return builder.RequireAssertion(ctx =>
               ctx.User.HasClaim(ClaimTypes.Role, "Admin") ||
               ctx.User.HasClaim(ClaimTypes.Role, role));
            }

        /// <summary>
        /// Add atspm authorization
        /// </summary>
        /// <param name="services"></param>
        /// <returns></returns>
        public static IServiceCollection AddAtspmAuthorization(this IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                var rolePolicies = new (string Policy, string Role)[]
                {
                    ("CanViewUsers", "User:View"),
                    ("CanEditUsers", "User:Edit"),
                    ("CanDeleteUsers", "User:Delete"),

                    ("CanViewRoles", "Role:View"),
                    ("CanEditRoles", "Role:Edit"),
                    ("CanDeleteRoles", "Role:Delete"),

                    ("CanViewLocationConfigurations",  "LocationConfiguration:View"),
                    ("CanEditLocationConfigurations",  "LocationConfiguration:Edit"),
                    ("CanDeleteLocationConfigurations","LocationConfiguration:Delete"),

                    ("CanViewGeneralConfigurations",   "GeneralConfiguration:View"),
                    ("CanEditGeneralConfigurations",   "GeneralConfiguration:Edit"),
                    ("CanDeleteGeneralConfigurations", "GeneralConfiguration:Delete"),

                    ("CanViewData", "Data:View"),
                    ("CanEditData", "Data:Edit"),

                    ("CanViewWatchDog", "Watchdog:View"),

                    ("CanViewSpeedConfigurations",  "SpeedConfiguration:View"),
                    ("CanEditSpeedConfigurations",  "SpeedConfiguration:Edit"),
                    ("CanDeleteSpeedConfigurations","SpeedConfiguration:Delete"),

                    ("CanViewSpeedReports", "SpeedReport:View"),
                };

                foreach (var (policy, role) in rolePolicies)
                    options.AddPolicy(policy, p => p.RequireRoleOrAdmin(role));
            });

            return services;
        }
    }
}
