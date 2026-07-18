#!/bin/bash
find src/ -type f -name "*.tsx" | xargs sed -i -E 's/(<h[1-6][^>]*text-\[)#2A2623(\])/\1#3A251D\2/g'
