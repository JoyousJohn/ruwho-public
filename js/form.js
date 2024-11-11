var typingTimer;        
var doneTypingInterval = 300; 
var $input = $('#input-form');
var liveInput;
var touchDevice = ('ontouchstart' in document.documentElement);

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

//$('#input-form').submit(function(e) { if ($(window).width() > 500) { e.preventDefault(); }});

$('#input-form').on('input', function(e){

    if ($('input').val().replace(/ /g, '') === liveInput) { return; }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(doneTyping, doneTypingInterval);

    liveInput = $('input').val();

    if ($('#result, #info-div').is(':visible')) {
        $('#result, #info-div').fadeOut('fast');
        $('#result div').fadeOut(function() { $(this).remove(); });
        //$('#spinner').fadeIn(); 
    }
    
});

function isValid(str){
    //return !/[~`!#$%\^&*+=\\[\]\\';,/{}|\\":<>\?]/g.test(str);
    str = str.replace(/-/g,'').replace(/ /g, '')
    if (str.length > 0) {
        return /^[a-zA-Z]+$/.test(str) 
    } else {
        return "onlyHyphen"
    }
}

var isAuth = true;
var observer;

// xhra = $.ajax({
    // url: 'https://ruwho-back.onrender.com/adv/init',
    // success: function() {
    //     isAuth = true
    //     //console.log("Authorized")
    //     observer = new IntersectionObserver(callback);
    // },
    // error: function() { 
    //     $('#insecure').show() 
    // }
// })

observer = new IntersectionObserver(callback);


function callback(entries, observer) {

    // alert('a')

    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // $(entry.target).css("background-color", "green")
            observer.unobserve(entry.target);
            const id = $(entry.target).attr('id')
            const target = $('#' + id).find('.extra-info')
            target.text('Loading...').fadeIn('fast')

            var response;

            if (localStorage.getItem(id) != null) {

                //console.log("RESPONSE loaded from localStorage")
                response = JSON.parse(localStorage.getItem(id))
                fill(target, response)

            } else {

                $.ajax({
                    url: 'https://ruwho-back.onrender.com/adv/' + id,
                    success: function(a_response) {
                        //console.log("RESPONSE loaded from API")
                        localStorage.setItem(id, JSON.stringify(a_response.person));
                        response = a_response.person;
                        fill(target, response);
                    }, error: function(response) {
                        if (response.status === 429) {
                            response = 429;
                            fill(target, response);
                        }
                    }
                })
            }
        }
    });
}

function fill(target, response) {
    target.text('').fadeOut('fast')

    if (response === 429) {
        target.append('<p>Rate limited</p>').fadeIn('fast');
        return;
    }

    if (response.email != undefined) {
        if (response.email != 'HIDDEN') {
            target.append('<p>' + response.email + '</p>').fadeIn('fast');
        }           
    } else if (response.emailAddress != undefined) {
        target.append('<p>' + response.emailAddress + '</p>').fadeIn('fast')
    }

    if (response.address != undefined) {
        target.append('<p>' + response.address + '</p>').fadeIn('fast')
    }

    if (response.phoneNumbers != undefined) {
        for (const p in response.phoneNumbers) {
            target.append('<p>' + p + ': ' + response.phoneNumbers[p] + '</p>').fadeIn('fast')
        }
    }
}

var xhr = $.ajax();

function doneTyping () {
    //console.log("REQUEST ABORTED")
    xhr.abort();
    //sleep(1);
    //console.log("REQUEST STARTED")

    var input = $('input').val();

    if (input != "") {

        hideIfMobile(); // Hide keyboard on first successful search

        // Invalid chars
        if (isValid(input) === false) {
            $('#info-div').text('Input contains invalid characters.')
            $("#info-div").fadeIn();
            hideSpinnerIfShown()
            return
        // Only hyphens or spaces
        } else if (isValid(input) === ('onlyHyphen')) {
            $('#info-div').text('Please enter some letters.')
            $("#info-div").fadeIn();
            hideSpinnerIfShown()
            return
        }

        // Too short
        if (input.replace(/ /g, '').length < 4) {
            $('#info-div').text('Please enter at least 4 letters.')
            $("#info-div").fadeIn();
            hideSpinnerIfShown()
            return
        }

        $('#spinner').fadeIn();

        xhr = $.ajax({
            url: 'https://ruwho-back.onrender.com/search/' + input,
            //dataType: "json",
            success: function(response) {
                //console.log(response);
                //console.log("REQUEST FINISHED");

                $('#spinner').fadeOut('fast');     
                
                if ($('#rate-limit').is(':visible')) { $('#rate-limit').fadeOut('fast'); }

                // Only one string
                if(!$('input').val().includes(" ") || (input.replace(/\s\s+/g, ' ').split(" ").length - 1 === 1 && /\s+$/.test(input))) {
                    $('#info-div').text('Some matches may be erroneous or hidden, please enter both a first and last name to narrow your search.')
                    $("#info-div").fadeIn();
                }

                // Oh so you're a programmer yourself now, aye?
                if (response.people == undefined) {
                    $('#info-div').text('Error! Did you mess with your client code? ;) (If not please tell me how you broke the site)')
                    $("#info-div").fadeIn();
                    return
                }

                if (response.people.length < response.numFound) {
                    $('#info-div').text('Some matches are currently hidden, narrow your search to display them.')
                    $("#info-wrapper").css("display", "flex");
                }   

                $('#result').append('<div id="found"><p>Showing ' + response.people.length + '/' + response.numFound + ' results</p></div>');
                for (let p in response.people) {
                    //console.log(response.people[p].name);                  
                    
                    $('#result').append(
                        '<div class="person-result" id="' + response.people[p].id + '">' 
                            +'<div>'
                                +'<p>' + response.people[p].name + '</p>'
                                +'<p class="person-role">' + response.people[p].role.toUpperCase() + ' - ' + response.people[p].dept.toUpperCase() + '</p>'
                            +'</div>'
                            + '<div class="extra-info">'
                            + '</div>'
                        +'</div>');          

                    if (isAuth) {
                        observer.observe(document.getElementById(response.people[p].id))
                    }
                    
                }
                $('#result').slideDown();

            }, error: function(response) {
                if (response.status === 429) {
                    $('#spinner').fadeOut('fast');
                    $('#rate-limit').text("You're being rate limited.").fadeIn('fast');
                }
            }
            
        })
    } else {
        hideSpinnerIfShown()
    }
}

function hideSpinnerIfShown() {
    if ($('#spinner').is(':visible')) $('#spinner').fadeOut('fast');
}

$(window).on('touchmove', function() { document.activeElement.blur(); hideIfMobile(); }); // Hide keyboard on touch scroll. Minimal performance drain so not checking if elm already has focus.

function hideIfMobile() { 

    /*if (touchDevice) {
        alert('is touch')
    } else {
        alert('is not touch')
    }*/

    if (touchDevice && $('#tips-wrapper').is(':visible')) $('#tips-wrapper').slideUp() 
}
