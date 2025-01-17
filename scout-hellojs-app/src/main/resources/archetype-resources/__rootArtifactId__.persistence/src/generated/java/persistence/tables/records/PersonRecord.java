/*
 * This file is generated by jOOQ.
 */
package ${package}.persistence.tables.records;

import ${package}.persistence.tables.Person;
import org.jooq.Record1;
import org.jooq.impl.UpdatableRecordImpl;

/**
 * This class is generated by jOOQ.
 */
@SuppressWarnings({ "all", "unchecked", "rawtypes" })
public class PersonRecord extends UpdatableRecordImpl<PersonRecord> {

  private static final long serialVersionUID = 1L;

  /**
   * Setter for <code>Schema.person.person_id</code>.
   */
  public void setPersonId(String value) {
    set(0, value);
  }

  /**
   * Getter for <code>Schema.person.person_id</code>.
   */
  public String getPersonId() {
    return (String) get(0);
  }

  /**
   * Setter for <code>Schema.person.first_name</code>.
   */
  public void setFirstName(String value) {
    set(1, value);
  }

  /**
   * Getter for <code>Schema.person.first_name</code>.
   */
  public String getFirstName() {
    return (String) get(1);
  }

  /**
   * Setter for <code>Schema.person.last_name</code>.
   */
  public void setLastName(String value) {
    set(2, value);
  }

  /**
   * Getter for <code>Schema.person.last_name</code>.
   */
  public String getLastName() {
    return (String) get(2);
  }

  /**
   * Setter for <code>Schema.person.salary</code>.
   */
  public void setSalary(Integer value) {
    set(3, value);
  }

  /**
   * Getter for <code>Schema.person.salary</code>.
   */
  public Integer getSalary() {
    return (Integer) get(3);
  }

  /**
   * Setter for <code>Schema.person.external</code>.
   */
  public void setExternal(Boolean value) {
    set(4, value);
  }

  /**
   * Getter for <code>Schema.person.external</code>.
   */
  public Boolean getExternal() {
    return (Boolean) get(4);
  }

  // -------------------------------------------------------------------------
  // Primary key information
  // -------------------------------------------------------------------------

  @Override
  public Record1<String> key() {
    return (Record1) super.key();
  }

  // -------------------------------------------------------------------------
  // Constructors
  // -------------------------------------------------------------------------

  /**
   * Create a detached PersonRecord
   */
  public PersonRecord() {
    super(Person.PERSON);
  }

  /**
   * Create a detached, initialised PersonRecord
   */
  public PersonRecord(String personId, String firstName, String lastName, Integer salary, Boolean external) {
    super(Person.PERSON);

    setPersonId(personId);
    setFirstName(firstName);
    setLastName(lastName);
    setSalary(salary);
    setExternal(external);
    resetChangedOnNotNull();
  }
}
