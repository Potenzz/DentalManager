# Server Setup Guide

## 1. Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Node.js (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

## 3. Install Python 3
```bash
sudo apt install -y python3 python3-pip python3-venv

python3 --version
pip3 --version
```

## 4. Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib

sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 5. Install Git
```bash
sudo apt install -y git
```
