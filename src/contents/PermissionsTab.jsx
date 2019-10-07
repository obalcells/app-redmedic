import React from "react";
import { message, Tabs, Button, Icon, Layout, Form, Input, Modal, Radio } from 'antd';
const { Header, Content, Footer } = Layout;

import PPHRComponent from "./PPHRComponent.jsx";

const Web3 = require("web3");

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

let providerNames = ["Corachan", "Pilar", "Teknon"]; //we should query for this in the production version
const mphrAbi = '[{"constant":false,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"}],"name":"deletePPHR","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"}],"name":"getPPHR","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"acta","outputs":[{"internalType":"contract Acta","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"gateways","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"actaAddr","outputs":[{"internalType":"address payable","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"id","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"},{"internalType":"address","name":"addr","type":"address"},{"internalType":"bytes32","name":"section","type":"bytes32"}],"name":"revokeAccess","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"pphrAddr","type":"address"}],"name":"newPPHR","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"returnGateways","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"bytes32","name":"name","type":"bytes32"},{"internalType":"address","name":"addr","type":"address"},{"internalType":"bytes32","name":"section","type":"bytes32"},{"internalType":"uint256","name":"nHours","type":"uint256"}],"name":"grantAccess","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_id","type":"bytes32"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"}]';


export default class PermissionsTab extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			providers: []
		}
	}

	componentDidMount() {
		this.queryAddresses();
	}

	queryAddresses() {
		var that = this;

		let web3 = new Web3(new Web3.providers.HttpProvider("https://rinkeby.infura.io"));
		if(web3.eth.getCode(this.props.profile.mphr) == '0x0' || web3.eth.getCode(this.props.profile.mphr) == '0x') {
			console.log("Nothing at address");
			return;
		}

		let mphr = new web3.eth.Contract(JSON.parse(mphrAbi));
		mphr.options.address = this.props.profile.mphr;

		/* we should query for the providerNames in production
		let providerNames = [];
		mphr.methods.().call({}, function (error, result) {
			if(error) {
				throw (error);
			}
			for(var i = 0; i < result.length; i++) {
				//let gateway = hex2a(result[i]).slice(1);
				//that.request(gateway, that.props.profile.id, "all");
				console.log(result);
			}
		});
		*/

		for(var i = 0; i < providerNames.length; i++) {
			let pn = providerNames[i];
			mphr.methods.getPPHR(web3.utils.fromAscii(pn)).call({}, function (error, result) {
				if(error) {
					throw (error);
				}
				let pphrAddr = result[1];
				let pphrGateway = hex2a(result[2]).slice(1);
				that.setState({providers:that.state.providers.concat({pphrAddr,pphrGateway})});
			});
		}
	}

	returnPPHRs() {
		return this.state.providers.map((provider) =>
			<PPHRComponent key={provider["pphrAddr"]} addr={provider["pphrAddr"]} gateway={provider["pphrGateway"]} profile={this.props.profile} />
		);
	}

	render() {
		//a container is this horizontal div showing the permissions for a particular pphr
		if(this.state.providers.length === 0) {
			return (<div style={{marginLeft:"210px"}}><div style={{marginLeft:"350px",marginTop:"250px"}} className="lds-ripple"><div></div><div></div></div></div>);
		}
		return (
			<Layout style={{marginLeft:"210px"}}>
				{this.returnPPHRs()}
			</Layout>
		);
	}
}