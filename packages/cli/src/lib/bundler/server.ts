/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import yn from 'yn';
import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import openBrowser from 'react-dev-utils/openBrowser';
import { choosePort, prepareUrls } from 'react-dev-utils/WebpackDevServerUtils';
import { createConfig } from './config';
import { ServeOptions } from './types';
import { resolveBundlingPaths } from './paths';

export async function serveBundle(options: ServeOptions) {
  const host = process.env.HOST ?? '0.0.0.0';
  const defaultPort = parseInt(process.env.PORT ?? '', 10) || 3000;

  const port = await choosePort(host, defaultPort);
  if (!port) {
    throw new Error(`Invalid or no port set: '${port}'`);
  }

  const protocol = yn(process.env.HTTPS, { default: false }) ? 'https' : 'http';
  const urls = prepareUrls(protocol, host, port);

  const paths = resolveBundlingPaths(options);
  const config = createConfig(paths, { ...options, isDev: true });
  const compiler = webpack(config);

  const server = new WebpackDevServer(compiler, {
    hot: true,
    publicPath: '/',
    historyApiFallback: true,
    clientLogLevel: 'warning',
    stats: 'errors-warnings',
    https: protocol === 'https',
    host,
    port,
  });

  await new Promise((resolve, reject) => {
    server.listen(port, host, (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      openBrowser(urls.localUrlForBrowser);
      resolve();
    });
  });

  const waitForExit = async () => {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, () => {
        server.close();
        // exit instead of resolve. The process is shutting down and resolving a promise here logs an error
        process.exit();
      });
    }

    // Block indefinitely and wait for the interrupt signal
    return new Promise(() => {});
  };

  return waitForExit;
}
