import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import ProductCard from "./ProductCard";
import "../styles/CategorySection.css";
import { API_BASE_URL} from '../constants'; 


export default function Items() {
    const [allitems, setAllitems] = useState([]);
    const location = useLocation(); // Get full URL details
    const searchParams = new URLSearchParams(location.search);
    const agentId = searchParams.get("agentid"); // Extract agentid

    useEffect(() => {
        const fetchData = async () => {
            try {
                let url = `${API_BASE_URL}/items/`;
                if (agentId) {
                    url += `?agentid=${agentId}`;
                }

                console.log("Fetching items from:", url);
                const response = await axios.get(url);
                setAllitems(response.data);
            } catch (error) {
                console.log("Error fetching items:", error);
            }
        };

        fetchData();
    }, [location.search]); // 🔥 Trigger when query params change

    return (
        <div className="container all-items">
            <h2 className="page-title">All Items</h2>

            {allitems.length === 0 ? (
                <p className="text-center">No items found</p>
            ) : (
                <div className="flex-grid">
                    {allitems.map((item) => (
                        <div key={item.id} className="flex-item">
                            <ProductCard item={item} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
