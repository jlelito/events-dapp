import React, { useEffect, useState } from 'react';
import EventContract from './contracts/EventContract.json';
import { getWeb3 } from './utils.js';

function App() {
  const [web3, setWeb3] = useState(undefined);
  const [accounts, setAccounts] = useState(undefined);
  const [contract, setContract] = useState(undefined);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const init = async () => {
      const web3 = await getWeb3();
      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = EventContract.networks[networkId];
      const contract = new web3.eth.Contract(
        EventContract.abi,
        deployedNetwork && deployedNetwork.address,
      );
      
      setWeb3(web3);
      setAccounts(accounts);
      setContract(contract);
    }
    init();
    window.ethereum.on('accountsChanged', accounts => {
      setAccounts(accounts);
    });
  }, []);

  const isReady = () => {
    return (
      typeof contract !== 'undefined' 
      && typeof web3 !== 'undefined'
      && typeof accounts !== 'undefined'
    );
  }

  useEffect(() => {
    if(isReady()) {
      updateEvents();
      updateTickets();
    }
  }, [accounts, contract, web3]);

  

  async function updateEvents() {
    const nextId = parseInt(await contract.methods
      .nextId()
      .call());

    const events = [];
    for(let i = 0; i < nextId; i++) { 
      events.push(contract.methods.events(i).call())
    }
    setEvents(await Promise.all(events));
    await updateTickets();
  }

  async function updateTickets() {
    const nextId = parseInt(await contract.methods
      .nextId()
      .call());

    const tickets = [];
    for(let i = 0; i < nextId; i++) { 
      tickets.push(contract.methods.tickets(accounts[0], i).call());
    }
    
    setTickets(await Promise.all(tickets));
  }

  async function transferTicket(e) {
    e.preventDefault();
    console.log("transferring tickets");
    const eventId = e.target.elements[0].value;
    const amount = e.target.elements[1].value;
    const to = e.target.elements[2].value;
    await contract.methods.transferTicket(eventId, amount, to).send({from: accounts[0]});
    await updateEvents();
  };

  async function buyTicket(e, event) {
    e.preventDefault();
    const amount = web3.utils.toBN(e.target.elements[0].value);
    const price = web3.utils.toBN(event.price);
    await contract.methods
      .buyTicket(event.id, amount.toString())
      .send({from: accounts[0], value: amount.mul(price).toString()});
    await updateEvents();
  };

  async function createEvent(e) {
    e.preventDefault();
    const name = e.target.elements[0].value;
    const date = Math.floor(
      (new Date(e.target.elements[1].value)).getTime() / 1000
    );
    const price = e.target.elements[2].value;
    const ticketCount = e.target.elements[3].value;
    await contract.methods
    .createEvent(name, date, price, ticketCount)
    .send({from: accounts[0]});
    await updateEvents();
  };

  function isFinished(event) {
    const now = new Date().getTime();
    const eventEnd =  (new Date(parseInt(event.date) * 1000)).getTime();
    return (eventEnd > now) ? false : true;
  }

  

  if (!isReady()) {
    return <div className="text-center">Loading... Please Connect to <b>Ropsten Test Network</b> </div>;
  }

  return (
    <div className="container">
      <h1 className="text-center">Event Organization</h1>

      <div className="row">
        <div className="col-sm-12">
          <span>Current Account: <b>{accounts[0]}</b></span>
          <h2>Create event</h2>
          <form onSubmit={e => createEvent(e)}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input type="text" className="form-control" id="name" />
            </div>
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input type="date" className="form-control" id="date" />
            </div>
            <div className="form-group">
              <label htmlFor="price">Price (Wei)</label>
              <input type="text" className="form-control" id="price" />
            </div>
            <div className="form-group">
              <label htmlFor="ticketCount">Ticket count</label>
              <input type="text" className="form-control" id="ticketCount" />
            </div>
            <button type="submit" className="btn btn-primary">Submit</button>
          </form>
        </div>
      </div>

      <hr/>

      <div className="row">
        <div className="col-sm-12">
          <h2>Transfer tickets</h2>
          <form onSubmit={e => transferTicket(e)}>
            <div className="form-group">
              <label htmlFor="eventId">Event ID</label>
              <input type="text" className="form-control" id="eventId" />
            </div>
            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <input type="text" className="form-control" id="amount" />
            </div>
            <div className="form-group">
              <label htmlFor="to">To</label>
              <input type="text" className="form-control" id="to" />
            </div>
            <button type="submit" className="btn btn-primary">Submit</button>
          </form>
        </div>
      </div>

      <hr/>

      <div className="row table-responsive-md">
        <div className="col-sm-12">
          <h2>Events</h2>
          <table className="table table-hover">
            <caption>List of events recorded</caption>
            <thead className="thead-light">
              <tr>
                <th>ID</th>
                <th>Admin</th>
                <th>Name</th>
                <th>Date</th>
                <th>Price</th>
                <th>Ticket remaining</th>
                <th>Total tickets</th>
                <th>Buy</th>
                <th>Number of tickets owned</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td>{event.id}</td>
                  <td>{event.admin}</td>
                  <td>{event.name}</td>
                  <td>
                    {(new Date(parseInt(event.date) * 1000)).toLocaleString()}
                  </td>
                  <td>{event.price} Wei</td>
                  <td>{event.ticketRemaining}</td>
                  <td>{event.ticketCount}</td>
                  <td>
                    {isFinished(event) ? 'Event finished' : (
                      <form onSubmit={e => buyTicket(e, event)}>
                        <div className="form-group">
                          <label htmlFor="amount">Amount</label>
                          <input type="text" className="form-control" id="amount" />
                        </div>
                        <button type="submit" className="btn btn-primary">Submit</button>
                      </form>
                    )}
                  </td>
                    <td>{tickets[event.id]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
