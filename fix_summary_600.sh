#!/bin/bash
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/text-\[#D95D1A\]/text-orange-600/g'
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/bg-\[#D95D1A\]/bg-orange-600/g'
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/border-\[#D95D1A\]/border-orange-600/g'
find src/components/summary -type f -name "*.tsx" | xargs sed -i 's/ring-\[#D95D1A\]/ring-orange-600/g'
