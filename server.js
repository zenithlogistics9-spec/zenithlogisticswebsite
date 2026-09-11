const express = require('express');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const leadsFile = path.join(__dirname, 'data', 'leads.json');

app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'100kb'}));
app.use(express.urlencoded({extended:true,limit:'100kb'}));
app.use(express.static(publicDir,{extensions:['html']}));

function clean(v,max=1000){return String(v||'').replace(/[<>]/g,'').trim().slice(0,max)}
app.post('/api/quote', async (req,res)=>{
  try{
    if(req.body.website) return res.status(200).json({ok:true});
    const lead={
      id: Date.now().toString(36),
      createdAt:new Date().toISOString(),
      name:clean(req.body.name,120),
      company:clean(req.body.company,160),
      email:clean(req.body.email,180),
      phone:clean(req.body.phone,80),
      service:clean(req.body.service,120),
      route:clean(req.body.route,220),
      message:clean(req.body.message,2500)
    };
    if(!lead.name || !lead.email || !lead.service) return res.status(400).json({ok:false,message:'Veuillez remplir les champs obligatoires.'});
    let leads=[]; try{leads=JSON.parse(fs.readFileSync(leadsFile,'utf8'))}catch{}
    leads.push(lead); fs.mkdirSync(path.dirname(leadsFile),{recursive:true}); fs.writeFileSync(leadsFile,JSON.stringify(leads,null,2));
    if(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS){
      const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE)==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
      await transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:process.env.LEADS_EMAIL||'zenithlogistics9@gmail.com',replyTo:lead.email,subject:'Nouvelle demande de devis — Zenith Logistic Transport',text:Object.entries(lead).map(([k,v])=>k+': '+v).join('\n')});
    }
    res.json({ok:true,message:'Votre demande a bien été envoyée.'});
  }catch(e){console.error(e);res.status(500).json({ok:false,message:'Une erreur est survenue. Contactez-nous directement.'})}
});
app.use((req,res)=>res.status(404).sendFile(path.join(publicDir,'404.html')));
app.listen(PORT,()=>console.log('Zenith Logistic Transport running on port '+PORT));
