declare module "is-base64" {
    interface IsBase64Options {
        allowMime?: boolean;
        allowEmpty?: boolean;
    }

    function isBase64(value: string, options?: IsBase64Options): boolean;

    export default isBase64;
}

