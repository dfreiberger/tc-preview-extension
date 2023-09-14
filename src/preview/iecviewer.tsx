import React, { useState, useEffect, useRef } from 'react';

import 'prismjs';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-iecst'; // Language
import "prismjs/plugins/line-numbers/prism-line-numbers";
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

import darkTheme from './prism-dark.module.css';
import lightTheme from './prism-light.module.css';

Prism.manual = true;

type IecViewerData = {
    xml?: XMLDocument;
    urlParams?: { [key: string]: string };
}

type IecElement = {
    section: string,
    name: string,
    element: Element
}

const IecSection = ({ section, name, element }: IecElement) => {
    const declaration = element.getElementsByTagName("Declaration")[0];
    const declarationContent = declaration ? declaration.textContent : "No content"

    const implementation = element.getElementsByTagName("Implementation")[0];
    const implementationST = implementation ? implementation.getElementsByTagName("ST")[0] : null;
    const implementationContent = implementationST ? implementationST.textContent : "Unable to display content, it may be an unsupported format"

    return (
        <div>
            <section id={section}>
                <h4>{name}</h4>
                {(declaration && 
                <pre className='line-numbers'>
                    <code className='language-iecst'>
                        {declarationContent}
                    </code>
                </pre> )}
                {(implementation && 
                <pre className='line-numbers'> 
                    <code className='language-iecst'>
                        {implementationContent}
                    </code>
                </pre> )}
            </section>
        </div>
    )
};


const PouOrItfSection = ({ element }: IecElement) => {
    const pouNodes = Array.from(element.children);
    const pouName = `(POU) ${element.getAttribute("Name")}`;
    const sectionName = element.getAttribute("Name")?.toLowerCase() ?? "pou";

    pouNodes.sort((a, b) => {
        try {
            var aFolder = a.getAttribute("FolderPath") ?? "";
            var aName = a.getAttribute("Name") ?? "";
            var aAttr = aFolder + aName;

            var bFolder = b.getAttribute("FolderPath") ?? "";
            var bName = b.getAttribute("Name") ?? "";
            var bAttr = bFolder + bName;

            if (aAttr < bAttr)
                return -1; // First should be sorted above second
            else if (aAttr < bAttr)
                return 1; // Second should be sorted above first
            return 0;
        }
        catch
        {
            return 1;
        }
    });

    // Get all Methods, Actions, Transitions, and Properties
    return (
        <div>
            <IecSection key={pouName} name={pouName} element={element} section={sectionName} />
            {pouNodes.map((c, i) => {
                const folderPath = c.getAttribute("FolderPath");
                var childName = folderPath ? folderPath : "";
                childName += c.getAttribute("Name");
                var name = `(${c.nodeName}) ${childName}`;
                var key = childName.toLowerCase();

                switch (c.nodeName) {
                    case "Method":
                    case "Action":
                    case "Transition":
                        return <IecSection key={key} name={name} element={c} section={key}/>
                    case "Property":
                        const setter = c.getElementsByTagName("Set")[0];
                        const getter = c.getElementsByTagName("Get")[0];
                        var sections = new Array();
                        if (setter) {
                            const pName = name + ".Set";
                            sections.push(<IecSection key={key + "-set"} name={pName} element={setter} section={key + "-set"}/>);
                        }
                        if (getter) {
                            const pName = name + ".Get";
                            sections.push(<IecSection key={key + "-get"} name={pName} element={getter} section={key + "-get"}/>);
                        }
                        return sections;
                    case "Folder":
                        break;
                    default:
                        //
                }
            })
        }
        </div>
    )
}

const IecViewer = ({ xml, urlParams }: IecViewerData) => {
    if (!xml) {
        return (
            <div>No content</div>
        )
    }

    useEffect(() => {
        Prism.highlightAll();

        // if section is specified in the url, scroll to it
        const section = urlParams?.section;
        if (section) {
            const sectionElement = document.querySelector( `#${section}`);
            sectionElement?.scrollIntoView( { behavior: 'auto', block: 'center' } );
        }
    }, [xml]);

    const [currentTheme, setCurrentTheme] = useState(lightTheme.prism_container);

    // hack to set the theme based on an event generated by the SDK and/or the currently set palette
    useEffect(() => {
        const onThemeChanged = (event : any) => {
            if (event.detail.name === "Dark")
                setCurrentTheme(darkTheme.prism_container)
            else
                setCurrentTheme(lightTheme.prism_container)
        };

        window.addEventListener("themeChanged", onThemeChanged); 
        
        // get the current theme by looking at the palette
        // this may break in the future but was the only way I could figure out to access the theme
        // without depending on an external API call
        const bodyStyles = window.getComputedStyle(document.body);
        var primary = bodyStyles.getPropertyValue('--palette-primary').trim();
        if (primary === "0, 129, 227")
            setCurrentTheme(darkTheme.prism_container)

        return () => {
            window.removeEventListener("themeChanged", onThemeChanged);
        }
    })

    return (
        <div className={currentTheme}>
            {Array.from(xml.children[0].children).map((n, i) => {
                var name = n.getAttribute("Name") ?? "?";
                const section = "main-iec-content";
                switch (n.nodeName) {
                    case "DUT":
                        return <IecSection key={i} name={name} element={n} section={section}/>
                    case "POU":
                        return <PouOrItfSection key={i} name={name} element={n} section={section}/>
                    case "GVL":
                        return <IecSection key={i} name={name} element={n} section={section}/>
                    case "Itf":
                        return <PouOrItfSection key={i} name={name} element={n} section={section}/>
                    default:
                        console.log("Unsupported type, ", n.nodeName);
                }
            })}
        </div>
    )
};

export default IecViewer;