#!/bin/bash
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/text-\[#FF7518\]/text-orange-500/g'
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/bg-\[#FF7518\]/bg-orange-500/g'
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/border-\[#FF7518\]/border-orange-500/g'
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/ring-\[#FF7518\]/ring-orange-500/g'
