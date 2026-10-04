
const tabs = Array.from(document.querySelectorAll('[data-tab]'));
function selectTrainingTab(name, focus=false){
 tabs.forEach(tab=>{const active=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!active;if(active&&focus)tab.focus();});
}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>selectTrainingTab(tab.dataset.tab));tab.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();selectTrainingTab(tabs[next].dataset.tab,true);});});
document.getElementById('show-onsite').addEventListener('click',()=>{selectTrainingTab('onsite');document.getElementById('oferta').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});

// Incoming course links reveal the matching panel without changing the default tab.
function revealTrainingAnchor(){
 let anchor;
 try{anchor=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
 const target=document.getElementById(anchor);
 const panel=target?.closest('[role="tabpanel"]');
 if(!panel||!['online','onsite'].includes(panel.id))return;
 selectTrainingTab(panel.id);
 requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
}
window.addEventListener('hashchange',revealTrainingAnchor);
revealTrainingAnchor();
