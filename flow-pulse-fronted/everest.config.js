module.exports = {
  baseURL: '/flowpulse/',
  pages: {
    index: {
      entry: './app',
      template: './public/index.html',
    },
  },
  alias: {
    '@': './src',
    '@api': './src/api',
    '@components': './src/components',
    '@features': './src/features',
    '@i18n': './src/i18n',
    '@theme': './src/theme',
    '@styles': './src/styles',
  },
  bizOptions: {
    disabled: true,
  },
  resources: {
    disabled: true,
  },
  proxy: [
    {
      context: [
        '/tenant',
        '/frontend',
        '/notify',
        '/portal',
        '/themes',
        '/uyun-base',
      ],
      target: 'http://10.1.53.201:7508/',
      secure: false,
      headers: {
        Connection: 'keep-alive',
      },
      onProxyRes(proxyRes) {
        let cookie = proxyRes.headers['set-cookie'] || [];
        cookie = cookie.map((item) =>
          item
            .split(';')
            .filter((val) => !/^\s*secure\s*$/.test(val))
            .join(';')
        );
        proxyRes.headers['set-cookie'] = cookie;
      },
    },
    {
      context: ['/flowpulse'],
      target: 'http://localhost:8466/',
      secure: false,
    },
  ],
};
