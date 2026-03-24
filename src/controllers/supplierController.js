import { signup, login, profile, signup_send_otp, add_bank_details, add_gst_details, getAllSupplier, add_products, add_product_variants, add_product_images, create_warehouse, update_warehouse, get_warehouse, delete_warehouse, create_inventory, update_inventory_stock, get_inventory, delete_inventory, get_inventory_by_filter, logout, updatePersonalDetails, get_bank_account_details, update_bank_details, get_gst_details, get_products, get_single_product, update_product } from "../utils/supplierFnc.js";
import { getPlatformCollectionAccount } from "../utils/platformCollectionAccount.js";


class SupplierController {

    async supplier_register(req, res) {
        try {
            console.log(req.body);
            const result = await signup(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async supplier_send_otp(req, res) {
        try {
            const result = await signup_send_otp(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async supplier_verify_otp(req, res) {
        try {
            const result = await signup(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async supplier_login(req, res) {
        try {
            const result = await login(req, res);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async supplier_logout(req, res) {
        try {
            const result = await logout(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async supplier_profile(req, res) {
        try {
            const result = await profile(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // async supplier_update_profile(req, res) {
    //     try {
    //         const result = await profile(req);
    //         res.json(result);
    //     } catch (error) {
    //         res.status(500).json({ error: error.message });
    //     }
    // }

    // async supplier_update_password(req, res) {
    //     try {
    //         const result = await profile(req);
    //         res.json(result);
    //     } catch (error) {
    //         res.status(500).json({ error: error.message });
    //     }
    // }

    // async supplier_update_profile(req, res) {
    //     try {
    //         const result = await profile(req);
    //         res.json(result);
    //     } catch (error) {
    //         res.status(500).json({ error: error.message });
    //     }

    // }

    // async supplier_update_password(req, res) {

    // }

    async supplier_bank_account_details(req, res) {
        try {
            const result = await add_bank_details(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update_bank_account_details(req, res) {
        try {
            const result = await update_bank_details(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async get_bank_account_details(req, res) {
        try {
            const result = await get_bank_account_details(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    /** Where to pay Unicsi (UPI / bank) for manual top-ups — same data superadmin configures. */
    async get_platform_payment_details(req, res) {
        try {
            const result = await getPlatformCollectionAccount();
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async add_gst_details(req, res) {
        try {
            const result = await add_gst_details(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async get_gst_details(req, res) {
        try {
            const result = await get_gst_details(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getAllSupplier(req, res) {
        try {
            const result = await getAllSupplier();
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async add_products(req, res) {
        try {
            const result = await add_products(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async get_products(req, res) {
        try {
            const result = await get_products(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async get_single_product(req, res) {
        try {
            const result = await get_single_product(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update_product(req, res) {
        try {
            const result = await update_product(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete_product(req, res) {
        try {
            const result = await delete_product(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async add_product_variants(req, res) {
        try {
            const result = await add_product_variants(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async add_product_images(req, res) {
        try {
            const result = await add_product_images(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create_warehouse(req, res) {
        try {
            const result = await create_warehouse(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update_warehouse(req, res) {
        try {
            const result = await update_warehouse(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async get_warehouse(req, res) {
        try {
            const result = await get_warehouse(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete_warehouse(req, res) {
        try {
            const result = await delete_warehouse(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create_inventory(req, res) {
        try {
            const result = await create_inventory(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async get_inventory(req, res) {
        try {
            const result = await get_inventory(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async update_inventory_stock(req, res) {
        try {
            const result = await update_inventory_stock(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async delete_inventory(req, res) {
        try {
            const result = await delete_inventory(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }   

    async get_inventory_by_filter(req, res) {
        try {
            const result = await get_inventory_by_filter(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async supplier_personal_details(req, res) {
        try {
            const result = await updatePersonalDetails(req);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default new SupplierController();
