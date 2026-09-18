#!/bin/bash
cd /var/www/valtrix
rm -rf .next
pnpm build > /tmp/b8.log 2>&1
echo "BUILD_EXIT=$?" >> /tmp/b8.log
