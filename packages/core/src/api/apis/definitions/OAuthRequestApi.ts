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

import { IconComponent } from '../../../icons';
import { Observable } from '../../types';
import { ApiRef } from '../ApiRef';

export type OAuthScopes = {
  extend(scopes: OAuthScopeLike): OAuthScopes;
  hasScopes(scopes: OAuthScopeLike): boolean;
  toSet(): Set<string>;
  toString(): string;
};

export type OAuthScopeLike =
  | string /** Space separated scope strings */
  | string[] /** Array of individual scope strings */
  | OAuthScopes;

/**
 * Options used to open a login popup.
 */
export type LoginPopupOptions = {
  /**
   * The URL that the auth popup should point to
   */
  url: string;

  /**
   * The name of the popup, as in second argument to window.open
   */
  name: string;

  /**
   * The origin of the final popup page that will post a message to this window.
   */
  origin: string;

  /**
   * The width of the popup in pixels, defaults to 500
   */
  width?: number;

  /**
   * The height of the popup in pixels, defaults to 700
   */
  height?: number;
};

/**
 * Information about the auth provider that we're requesting a login towards.
 *
 * This should be shown to the user so that they can be informed about what login is being requested
 * before a popup is shown.
 */
export type AuthProvider = {
  /**
   * Title for the auth provider, for example "GitHub"
   */
  title: string;

  /**
   * Icon for the auth provider.
   */
  icon: IconComponent;
};

/**
 * Describes how to handle auth requests. Both how to show them to the user, and what to do when
 * the user accesses the auth request.
 */
export type AuthRequesterOptions<AuthResponse> = {
  /**
   * Information about the auth provider, which will be forwarded to auth requests.
   */
  provider: AuthProvider;

  /**
   * Implementation of the auth flow, which will be called synchronously when
   * trigger() is called on an auth requests.
   */
  onAuthRequest(scope: OAuthScopes): Promise<AuthResponse>;
};

/**
 * Function used to trigger new auth requests for a set of scopes.
 *
 * The returned promise will resolve to the same value returned by the onAuthRequest in the
 * AuthRequesterOptions. Or rejected, if the request is rejected.
 *
 * This function can be called multiple times before the promise resolves. All calls
 * will be merged into one request, and the scopes forwarded to the onAuthRequest will be the
 * union of all requested scopes.
 */
export type AuthRequester<AuthResponse> = (
  scope: OAuthScopes,
) => Promise<AuthResponse>;

/**
 * An pending auth request for a single auth provider. The request will remain in this pending
 * state until either reject() or trigger() is called.
 *
 * Any new requests for the same provider are merged into the existing pending request, meaning
 * there will only ever be a single pending request for a given provider.
 */
export type PendingAuthRequest = {
  /**
   * Information about the auth provider, as given in the AuthRequesterOptions
   */
  provider: AuthProvider;

  /**
   * Rejects the request, causing all pending AuthRequester calls to fail with "RejectedError".
   */
  reject: () => void;

  /**
   * Trigger the auth request to continue the auth flow, by for example showing a popup.
   *
   * Synchronously calls onAuthRequest with all scope currently in the request.
   */
  trigger(): Promise<void>;
};

/**
 * Provides helpers for implemented OAuth login flows within Backstage.
 */
export type OAuthRequestApi = {
  /**
   * Show a popup pointing to a URL that starts an OAuth flow.
   *
   * The redirect handler of the flow should use postMessage to communicate back
   * to the app window.
   *
   * The returned promise resolves to the contents of the message that was posted from the auth popup.
   */
  showLoginPopup(options: LoginPopupOptions): Promise<any>;

  /**
   * A utility for showing login popups or similar things, and merging together multiple requests for
   * different scopes into one request that inclues all scopes.
   *
   * The passed in options provide information about the login provider, and how to handle auth requests.
   *
   * The returned AuthRequester function is used to request login with new scopes. These requests
   * are merged together and forwarded to the auth handler, as soon as a consumer of auth requests
   * triggers an auth flow.
   *
   * See AuthRequesterOptions, AuthRequester, and handleAuthRequests for more info.
   */
  createAuthRequester<AuthResponse>(
    options: AuthRequesterOptions<AuthResponse>,
  ): AuthRequester<AuthResponse>;

  /**
   * Observers panding auth requests. The returned observable will emit all
   * current active auth request, at most one for each created auth requester.
   *
   * Each request has its own info about the login provider, forwarded from the auth requester options.
   *
   * Depending on user interaction, the request should either be rejected, or used to trigger the auth handler.
   * If the request is rejected, all pending AuthRequester calls will fail with a "RejectedError".
   * If a auth is triggered, and the auth handler resolves successfully, then all currently pending
   * AuthRequester calls will resolve to the value returned by the onAuthRequest call.
   */
  authRequest$(): Observable<PendingAuthRequest[]>;
};

export const oauthRequestApiRef = new ApiRef<OAuthRequestApi>({
  id: 'core.oauthrequest',
  description: 'An API for implementing unified OAuth flows in Backstage',
});
