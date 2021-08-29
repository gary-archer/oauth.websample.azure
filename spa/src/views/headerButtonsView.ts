import {DomUtils} from './domUtils';

/*
 * A simple view for the header buttons
 */
export class HeaderButtonsView {

    private readonly _onHome: () => void;
    private readonly _onExpireAccessToken: () => void;
    private readonly _onExpireRefreshToken: () => void;
    private readonly _onReloadData: () => void;
    private readonly _onLogout: () => void;

    public constructor(
        onHome: ()          => void,
        onReloadData: ()   => void,
        onExpireAccessToken: ()   => void,
        onExpireRefreshToken: ()   => void,
        onLogout: ()        => void) {

        this._onHome = onHome;
        this._onReloadData = onReloadData;
        this._onExpireAccessToken = onExpireAccessToken;
        this._onExpireRefreshToken = onExpireRefreshToken;
        this._onLogout = onLogout;
    }

    /*
     * Render the view
     */
    /* eslint-disable max-len */
    public load(): void {

        const html =
            `<div class='row'>
                <div class='col-one-fifth my-2 d-flex p-1'>
                    <button id='btnHome' type='button' class='btn btn-primary btn-block p-1'>Home</button>
                </div>
                <div class='col-one-fifth my-2 d-flex p-1'>
                    <button id='btnReloadData' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Reload Data</button>
                </div>
                <div class='col-one-fifth my-2 d-flex p-1'>
                    <button id='btnExpireAccessToken' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Expire Access Token</button>
                </div>
                <div class='col-one-fifth my-2 d-flex p-1'>
                    <button id='btnExpireRefreshToken' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Expire Refresh Token</button>
                </div>
                <div class='col-one-fifth my-2 d-flex p-1'>
                    <button id='btnLogout' type='button' disabled class='btn btn-primary btn-block p-1 sessionbutton'>Logout</button>
                </div>
            </div>`;
        DomUtils.html('#headerbuttons', html);

        // Button clicks are handled by the parent class
        DomUtils.onClick('#btnHome', this._onHome);
        DomUtils.onClick('#btnExpireAccessToken', this._onExpireAccessToken);
        DomUtils.onClick('#btnExpireRefreshToken', this._onExpireRefreshToken);
        DomUtils.onClick('#btnReloadData', this._onReloadData);
        DomUtils.onClick('#btnLogout', this._onLogout);
    }

    /*
     * Buttons are disabled before data is loaded
     */
    public disableSessionButtons(): void {
        document.querySelectorAll('.sessionbutton').forEach((b) => b.setAttribute('disabled', 'disabled'));
    }

    /*
     * Buttons are enabled when all data loads successfully
     */
    public enableSessionButtons(): void {
        document.querySelectorAll('.sessionbutton').forEach((b) => b.removeAttribute('disabled'));
    }
}
