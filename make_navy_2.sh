#!/bin/bash
# Revert text-black in StatsBar to text-[#1B3A5C]
sed -i 's/text-black/text-[#1B3A5C]/g' src/components/layout/StatsBar.tsx
