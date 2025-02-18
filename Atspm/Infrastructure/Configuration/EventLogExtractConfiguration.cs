﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Utah.Udot.Atspm.Infrastructure.Configuration
{
    public class EventLogExtractConfiguration
    {
        public string FileFormat { get; set; }
        public string DateTimeFormat { get; set; }
        public IEnumerable<DateTime> Dates { get; set; }
        public IEnumerable<string> Included { get; set; }
        public IEnumerable<string> Excluded { get; set; }
        public DirectoryInfo Path { get; set; }
    }
}
