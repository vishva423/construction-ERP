/** @type {import('next').NextConfig} */
const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(path.resolve(__dirname, '../..'));

const nextConfig = {};

module.exports = nextConfig;
