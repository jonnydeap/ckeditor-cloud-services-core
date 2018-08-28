/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* eslint-env browser */

'use strict';

import mix from '@ckeditor/ckeditor5-utils/src/mix';
import ObservableMixin from '@ckeditor/ckeditor5-utils/src/observablemixin';

const DEFAULT_OPTIONS = { refreshInterval: 3600000, autoRefresh: true };

/**
 * Class representing the token used for communication with CKEditor Cloud Services.
 * Value of the token is retrieving from the specified URL and is refreshed every 1 hour by default.
 *
 * @mixes ObservableMixin
 */
class Token {
	/**
	 * Creates `Token` instance.
	 * Method `init` should be called after using the constructor or use `create` method instead.
	 *
	 * @param {String|Function} tokenUrlOrTokenRefresh Endpoint address to download the token or a callback that provides the token. If the
	 * value is a function it has to match the {@link ~refreshToken} interface.
	 * @param {Object} options
	 * @param {String} [options.initValue] Initial value of the token.
	 * @param {Number} [options.refreshInterval=3600000] Delay between refreshes. Default 1 hour.
	 * @param {Boolean} [options.autoRefresh=true] Specifies whether to start the refresh automatically.
	 */
	constructor( tokenUrlOrTokenRefresh, options = DEFAULT_OPTIONS ) {
		if ( !tokenUrl ) {
			throw new Error( 'A `tokenUrl` or a `tokenRefresh` function must be provided as the first constructor argument.' );
		}

		/**
		 * Value of the token.
		 * The value of the token is null if `initValue` is not provided or `init` method was not called.
		 * `create` method creates token with initialized value from url.
		 *
		 * @name value
		 * @member {String} #value
		 * @observable
		 * @readonly
		 */
		this.set( 'value', options.initValue );

		/**
		 * A token Url, which is requested by the {@link #_defaultRefreshToken} function.
		 * An empty string when the callback is provided in the constructor.
		 *
		 * @type {String}
		 * @private
		 */
		this._tokenUrl = typeof tokenUrlOrTokenRefresh === 'string' ? tokenUrl : '';

		/**
		 * @type {Object}
		 * @private
		 */
		this._options = Object.assign( {}, DEFAULT_OPTIONS, options );

		/**
		 * Refresh token function.
		 *
		 * @member {Function} #_refreshToken
		 * @private
		 */
		if ( typeof tokenUrlOrTokenRefresh === 'function' ) {
			this._refreshToken = () => {
				return tokenUrlOrTokenRefresh().then( value => this.set( 'value', value ) );
			}
		} else {
			this._refreshToken = this._defaultRefreshToken.bind( this );
		}
	}

	/**
	 * Initializes the token.
	 *
	 * @returns {Promise.<Token>}
	 */
	init() {
		return new Promise( ( resolve, reject ) => {
			if ( this._options.autoRefresh ) {
				this._startRefreshing();
			}

			if ( !this.value ) {
				this._refreshToken()
					.then( resolve )
					.catch( reject );

				return;
			}

			resolve( this );
		} );
	}

	/**
	 * The default function to get the new token.
	 *
	 * @protected
	 * @returns {Promise.<Token>}
	 */
	_defaultRefreshToken() {
		return new Promise( ( resolve, reject ) => {
			const xhr = new XMLHttpRequest();

			xhr.open( 'GET', this._tokenUrl );

			xhr.addEventListener( 'load', () => {
				const statusCode = xhr.status;
				const xhrResponse = xhr.response;

				if ( statusCode < 200 || statusCode > 299 ) {
					return reject( 'Cannot download new token!' );
				}

				this.set( 'value', xhrResponse );

				return resolve( this );
			} );

			xhr.addEventListener( 'error', () => reject( 'Network Error' ) );
			xhr.addEventListener( 'abort', () => reject( 'Abort' ) );

			xhr.send();
		} );
	}

	/**
	 * Starts value refreshing every `refreshInterval` time.
	 *
	 * @protected
	 */
	_startRefreshing() {
		this._refreshInterval = setInterval( this._refreshToken, this._options.refreshInterval );
	}

	/**
	 * Stops value refreshing.
	 *
	 * @protected
	 */
	_stopRefreshing() {
		clearInterval( this._refreshInterval );
	}

	/**
	 * Creates a initialized {@link Token} instance.
	 *
	 * @param {String|Function} tokenUrlOrTokenRefresh Endpoint address to download the token or a callback that provides the token. If the
	 * value is a function it has to match the {@link ~refreshToken} interface.
	 * @param {Object} options
	 * @param {String} [options.initValue] Initial value of the token.
	 * @param {Number} [options.refreshInterval=3600000] Delay between refreshes. Default 1 hour.
	 * @param {Boolean} [options.autoRefresh=true] Specifies whether to start the refresh automatically.
	 * @returns {Promise.<Token>}
	 */
	static create( tokenUrlOrTokenRefresh, options = DEFAULT_OPTIONS ) {
		const token = new Token( tokenUrlOrTokenRefresh, options );

		return token.init();
	}
}

mix( Token, ObservableMixin );

/**
 * This function is called in a defined interval by the {@link ~Token} class.
 * It should return a promise, which resolves with the new token url.
 * If any error occurs it should return a rejected promise with an error message.
 *
 * @function refreshToken
 * @returns {Promise.<String>}
 */

export default Token;
