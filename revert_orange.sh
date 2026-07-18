#!/bin/bash
find src/ -type f -name "*.tsx" | xargs sed -i 's/#FF7518/#F36F21/g'
find src/ -type f -name "*.tsx" | xargs sed -i 's/#1B3A5C/#F36F21/g'
find src/ -type f -name "*.tsx" | xargs sed -i 's/#D95D1A/#D95D1A/g'
