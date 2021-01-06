import $ from 'jquery';

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
        $('#headerbuttons').html(html);

        // Button clicks are handled by the parent class
        $('#btnHome').on('click', this._onHome);
        $('#btnExpireAccessToken').on('click', this._onExpireAccessToken);
        $('#btnExpireRefreshToken').on('click', this._onExpireRefreshToken);
        $('#btnReloadData').on('click', this._onReloadData);
        $('#btnLogout').on('click', this._onLogout);
    }

    /*
     * Buttons are disabled before data is loaded
     */
    public disableSessionButtons(): void {
        $('.sessionbutton').prop('disabled', true);
    }

    /*
     * Buttons are enabled when all data loads successfully
     */
    public enableSessionButtons(): void {
        $('.sessionbutton').prop('disabled', false);
    }
}
