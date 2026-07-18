#!/bin/bash
find src/components/summary/ -type f -name "*.tsx" | xargs sed -i 's/orange-500/\[#1B3A5C\]/g'
find src/components/summary/ -type f -name "*.tsx" | xargs sed -i 's/#EF9F27/#1B3A5C/g'
find src/components/summary/ -type f -name "*.tsx" | xargs sed -i 's/#D97706/#11253C/g'
