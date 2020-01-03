import React, { Component } from 'react';
import PropTypes from 'prop-types';
import interact from 'interactjs';

import connectToDatoCms from './connectToDatoCms';
import './style.css';

@connectToDatoCms(plugin => ({
  token: plugin.parameters.global.datoCmsApiToken,
  maxRecords: plugin.parameters.instance.maxRecords,
  itemId: plugin.itemId,
  fieldPath: plugin.fieldPath,
  getFieldValue: plugin.getFieldValue,
  setFieldValue: plugin.setFieldValue,
  addFieldChangeListener: plugin.addFieldChangeListener,
}))
export default class Main extends Component {
  static propTypes = {
    token: PropTypes.string,
    maxRecords: PropTypes.number,
    itemId: PropTypes.string,
    fieldPath: PropTypes.string,
    getFieldValue: PropTypes.func,
    setFieldValue: PropTypes.func,
    addFieldChangeListener: PropTypes.func,
  };

  state = {
    loading: true,
    dropDown: false,
    data: {},
    values: [],
  };

  componentDidMount() {
    const { addFieldChangeListener } = this.props;

    this.updateData();

    addFieldChangeListener('subtitle_files_languages', () => {
      this.updateData();
    });
  }

  getLanguageItem(itemRow) {
    const { setFieldValue, fieldPath } = this.props;
    const { data, values } = this.state;

    const subt = data.subtitleFilesLanguages.find(subtitle => (
      subtitle.id.uploadId === itemRow
    ));
    const locale = subt ? subt.lang : null;

    const languageName = this.detectLanguageFromLocale(locale);

    return (
      <div className="language-box" key={`subtitle_${itemRow}`} id={`subtitle_${itemRow}`}>
        <div>{`${languageName || locale} [${itemRow}]`}</div>
        <button
          type="button"
          className="cross"
          onClick={() => {
            values.splice(values.indexOf(itemRow), 1);
            setFieldValue(fieldPath, JSON.stringify(values));
          }}
        >
          <svg className="svg-cross" height="14" width="14" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" /></svg>
        </button>
      </div>
    );
  }

  getLanguageOption(dataRow) {
    const { setFieldValue, fieldPath } = this.props;
    const { values } = this.state;

    const languageName = this.detectLanguageFromLocale(dataRow.lang);

    return (
      <li
        key={`dropDownItem_${dataRow.id.uploadId}`}
        className="dropDownItem"
        onClick={() => {
          values.push(dataRow.id.uploadId);
          setFieldValue(fieldPath, JSON.stringify(values));
        }}
      >
        {`${languageName || dataRow.lang}`}
        <small>
          Titulky (TIT soubory) #
          {dataRow.id.uploadId}
        </small>
      </li>
    );
  }

  detectLanguageFromLocale(locale) {
    const languages = { cze: 'Čeština', eng: 'Angličtina' };
    return languages[locale];
  }

  toggleDropDown(e) {
    const { dropDown } = this.state;

    if (e.target === e.currentTarget) {
      this.setState({
        dropDown: !dropDown,
      });
    }
  }

  initializeInteract() {
    const position = { x: 0, y: 0 };
    const { setFieldValue, fieldPath } = this.props;
    const { values } = this.state;

    interact('.language-box').dropzone({
      overlap: 0.05,

      ondropactivate(event) {
        event.target.classList.toggle('drop-active');
      },
      ondragenter(event) {
        event.relatedTarget.classList.toggle('can-drop');
      },
      ondragleave(event) {
        event.relatedTarget.classList.toggle('can-drop');
      },
      ondrop(event) {
        const dropzoneArrayIndex = values.indexOf(event.target.id.split('_')[1]);
        const draggableArrayIndex = values.indexOf(event.relatedTarget.id.split('_')[1]);

        const removedValue = values.splice(
          dropzoneArrayIndex,
          1,
          values[draggableArrayIndex],
        );
        values.splice(draggableArrayIndex, 1, removedValue[0]);

        event.relatedTarget.classList.toggle('can-drop');
        setFieldValue(fieldPath, JSON.stringify(values));
      },
      ondropdeactivate(event) {
        const e = event;
        e.target.classList.toggle('drop-active');
        e.relatedTarget.style.transform = 'translate(0px, 0px)';
        position.x = 0;
      },
    });

    interact('.language-box').draggable({
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: false,
        }),
      ],
      startAxis: 'x',
      lockAxis: 'x',
      listeners: {
        move(event) {
          if (values.length > 1) {
            const draggableElement = event.target;

            position.x += event.dx;
            position.y += event.dy;

            draggableElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
          }
        },
      },
    });
  }

  updateData() {
    const { token, itemId } = this.props;
    const { getFieldValue, fieldPath } = this.props;

    this.setState({
      loading: true,
    });

    fetch('https://graphql.datocms.com/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
        {
          production(filter: {id: {eq: "${itemId}"}}) {
            subtitleFilesLanguages
          }
        }
        `,
      }),
    })
      .then(res => res.json())
      .then((res) => {
        this.setState({
          loading: false,
          data: res.data.production,
          values: JSON.parse(getFieldValue(fieldPath)) || [],
        });
        this.initializeInteract();
      })
      .catch((error) => {
        this.setState({
          loading: false,
        });
        console.log(error);
      });
  }

  render() {
    const {
      loading, dropDown, data, values,
    } = this.state;
    const { maxRecords } = this.props;

    if (loading) {
      return <div className="container">Načítám data...</div>;
    }
    
    console.log(values);

    return (
      <div className="container">
        <div
          role="button"
          tabIndex="0"
          className="select-container"
          onClick={(e) => { this.toggleDropDown(e); }}
          onKeyDown={(e) => { this.toggleDropDown(e); }}
        >
          {Array.isArray(values) && values.length !== 0 ? values.map(subtitleId => (
            this.getLanguageItem(subtitleId)
          )) : (
            <span onClick={(e) => { this.toggleDropDown(e); }} role="button" tabIndex="0">
              Vyberte maximálně 2 jazyky...
            </span>
          )
          }
          <div onClick={(e) => { this.toggleDropDown(e); }} aria-hidden="true" className="dropDownArrow"><svg onClick={(e) => { this.toggleDropDown(e); }} height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="css-19bqh2r"><path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z" /></svg></div>
        </div>
        {dropDown
          && (
            <ul className="dropDown">
              {!Array.isArray(values) || values.length < maxRecords
                ? Array.isArray(data.subtitleFilesLanguages)
                && data.subtitleFilesLanguages.length !== 0
                  ? data.subtitleFilesLanguages.map(dataRow => (
                    this.getLanguageOption(dataRow)
                  )) : <div>Žádné titulky nejsou k dispozici...</div>
                : (
                  <div>
                    Vybrán maximální počet titulků (
                    {maxRecords}
                    )...
                  </div>
                )
              }
            </ul>
          )}
      </div>
    );
  }
}
