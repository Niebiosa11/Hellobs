
// Umożliwia dostęp do zachowanej galerii i kontaktu bez dodatkowych bloków w głównym układzie.
function revealHomeDetails(){
 const target=document.getElementById(location.hash.slice(1));
 const details=target?.closest('details');
 if(details){details.open=true;details.scrollIntoView({block:'start'});}
}
window.addEventListener('hashchange',revealHomeDetails);
revealHomeDetails();
