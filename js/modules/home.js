export async function initHome({reader,state}){
 document.body.classList.add('isHomeView');
 reader.innerHTML='<section class="homeBlank" aria-label="首頁"></section>';
}
