#!/bin/bash
sed -i 's/text-\[#FF7518\] group-hover\/hdr:text-\[#FF7518\]/text-\[#1B3A5C\] group-hover\/hdr:text-\[#FF7518\]/g' src/components/calendar/CalendarView.tsx
sed -i 's/text-\[#FF7518\] group-hover\/yearcard:text-\[#FF7518\]/text-\[#1B3A5C\] group-hover\/yearcard:text-\[#FF7518\]/g' src/components/calendar/CalendarView.tsx
sed -i 's/bg-\[#FF7518\]\/10 text-\[#FF7518\]/bg-\[#1B3A5C\]\/10 text-\[#1B3A5C\]/g' src/components/calendar/CalendarView.tsx
