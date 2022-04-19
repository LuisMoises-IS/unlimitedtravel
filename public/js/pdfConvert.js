function imprimirPdf(){
    const element = document.getElementById("content");
    var opt = {
        margin:       1,
        filename:     'myfile.pdf',        
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
    };

    //html2pdf().from(element).save();
    html2pdf().set(opt).from(element).save();
}