﻿#region license
// Copyright 2025 Utah Departement of Transportation
// for WatchDog - Utah.Udot.ATSPM.WatchDog.Commands/WatchdogConfigCommand.cs
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

using System.CommandLine;

namespace Utah.Udot.ATSPM.WatchDog.Commands
{
    public class WatchdogConfigCommand : RootCommand
    {
        public WatchdogConfigCommand()
        {
            AddCommand(WatchdogCommand);
            AddCommand(EmailCommand);
        }

        public WatchdogCommand WatchdogCommand { get; set; } = new WatchdogCommand();
        public EmailCommand EmailCommand { get; set; } = new EmailCommand();
    }
}
