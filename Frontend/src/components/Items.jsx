import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import ProductCard from "./ProductCard";
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
            <h1 className="text-center mb-4" style={{ color: '#5a3825' }}>All Items</h1>

            <div className="row justify-content-center all-items-div">
                {allitems.length === 0 ? (
                    <p className="text-center">No items found</p>
                ) : (
                    allitems.map((item) => (
                        <div key={item.id} className="col-6 col-md-4 col-lg-3 d-flex justify-content-center">
                            <ProductCard item={item} smallImage={true} />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
