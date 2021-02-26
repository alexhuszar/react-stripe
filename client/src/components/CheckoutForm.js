import React, { useEffect, useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import "./CheckoutForm.css";
import api from "../api";

export default function CheckoutForm() {
  const [amount, setAmount] = useState(0);
  const [user, setUser] = useState({});
  const [currency, setCurrency] = useState("");
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [succeeded, setSucceeded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    // Step 1: Fetch product details such as amount and currency from
    // API to make sure it can't be tampered with in the client.
    api.getProductDetails().then((productDetails) => {
      setAmount(productDetails.amount / 100);
      setCurrency(productDetails.currency);
    });

    // Step 2: Create PaymentIntent over Stripe API
    api
      .createPaymentIntent()
      .then((clientSecret) => {
        setClientSecret(clientSecret);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  const handleValidateForm = ev => {
      console.log(ev.target.name)
      if(ev.target.name === 'name'){
          setUser({
              ...user,
              name: ev.target?.value,
          })
      }
      if(ev.target.name === 'email'){
          setUser({
              ...user,
              email: ev.target?.value,
          })
      }
      setError(null);

  }

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setProcessing(true);

    // Step 3: Use clientSecret from PaymentIntent and the CardElement
    // to confirm payment with stripe.confirmCardPayment()
    const payload = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: ev.target.name.value,
          email: ev.target.email.value,
        },
      },
    });

    if (payload.error) {
      setError(`Payment failed: ${payload.error.message}`);
      setProcessing(false);
      console.log("[error]", payload.error);
    } else {
      setError(null);
      setSucceeded(true);
      setProcessing(false);
      setMetadata(payload.paymentIntent);
      console.log("[PaymentIntent]", payload.paymentIntent);
    }
  };

  const renderSuccess = () => {
    return (
      <div className="sr-field-success message">
        <h1>Your test payment succeeded</h1>
        <p>View PaymentIntent response:</p>
        <pre className="sr-callout">
          <code>{JSON.stringify(metadata, null, 2)}</code>
        </pre>
      </div>
    );
  };

  const renderForm = () => {
    const options = {
      style: {
        base: {
          color: "#32325d",
          fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
          fontSmoothing: "antialiased",
          fontSize: "16px",
          "::placeholder": {
            color: "#aab7c4",
          },
        },
        invalid: {
          color: "#fa755a",
          iconColor: "#fa755a",
        },
      },
    };

    const { name, email } = user;
    const allFieldRequired = !email || !name;
    console.log(allFieldRequired, name, email, user);

    return (
      <form onSubmit={handleSubmit} onChange={handleValidateForm}>
        <h1>
          {currency.toLocaleUpperCase()}{" "}
          {amount.toLocaleString(navigator.language, {
            minimumFractionDigits: 2,
          })}{" "}
        </h1>
        <div className="sr-combo-inputs-row">
            <label htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Name"
              autoComplete="cardholder"
              className="sr-input"
            />

        </div>
        <div className="sr-combo-inputs-row">
        <label htmlFor="email">
          Email
        </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Email"
              autoComplete="email"
              className="sr-input"
            />

        </div>

          <div className="sr-combo-inputs-row">
            <label>
              Card detail
            </label>
            <CardElement
              className="sr-input sr-card-element"
              options={options}
            />
          </div>

        {error && <div className="message sr-field-error">{error}</div>}

        <button
          className="btn"
          disabled={processing || !clientSecret || !stripe || allFieldRequired}
        >
          {processing ? "Processing…" : "Pay"}
        </button>
      </form>
    );
  };

  return (
    <div className="checkout-form">
      <div className="sr-payment-form">
        <div className="sr-form-row" />
        {succeeded ? renderSuccess() : renderForm()}
      </div>
    </div>
  );
}
