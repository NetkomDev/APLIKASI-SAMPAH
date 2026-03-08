#!/bin/bash
ssh -o StrictHostKeyChecking=no ubuntu@124.156.202.180 << 'SSH_EOF'
pm2 logs ecosistem-bot --lines 100 --nostream
SSH_EOF
