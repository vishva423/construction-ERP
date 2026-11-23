/** @type {import('next').NextConfig} */
const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(path.resolve(__dirname, '../..'), process.env.NODE_ENV !== 'production', console, true);

const nextConfig = {};

module.exports = nextConfig;
