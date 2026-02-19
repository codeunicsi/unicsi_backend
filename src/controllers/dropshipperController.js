import { ShopifyStore } from '../models/index.js'
import crypto from "crypto";
import axios from "axios";

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES;
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

class DropshipperController {



    // connect shopify
    connectShopify = async (req, res) => {
        try {
            const { shop } = req.query;

            // Optional: validate
            if (!shop) {
                return res.status(400).json({ error: "Missing 'shop' query parameter" });
            }

            console.log("shop==>", shop);

            const state = crypto.randomBytes(16).toString("hex");
            const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${REDIRECT_URI}&state=${state}`;

            // For debugging with Postman: send the URL instead of redirecting
            // res.redirect(installUrl);
            res.json({ installUrl });
        } catch (error) {
            console.error("Error connecting to Shopify:", error);
            res.status(500).json({ error: "Failed to connect to Shopify" });
        }
    };



    // callback shopify
    callbackShopify = async (req, res) => {
        try {
            const { shop, code, state } = req.query;
            const stateStore = req.session.state;
            if (!stateStore || stateStore !== state) {
                return res.status(400).send("Invalid state parameter");
            }
            const response = await axios.post(
                `https://${shop}/admin/oauth/access_token`,
                {
                    client_id: API_KEY,
                    client_secret: API_SECRET,
                    code,
                }
            );
            const { access_token, scope } = response.data;
            
            // Save token and scope to database
            await ShopifyStore.create({
                shop_name: shop,
                access_token,
                scope,
            });

            res.redirect("http://localhost:3000/partner/connect/success");

        } catch (error) {
            console.error("Error connecting to Shopify:", error);
            res.status(500).send("Failed to connect to Shopify");
        }
    }

}

export default new DropshipperController();